const fs = require('fs'); 
const parse = require('csv-parse');

let fces = {};
let rowNum = 0;

const FCE_HOURS_ROW = 12;
const FCE_YEAR_ROW = 0;
const FCE_SEM_ROW = 1;
const FCE_COURSENUM_ROW = 4;
const FCE_COURSESEC_ROW = 5;

fs.createReadStream('data/fce_data.csv').pipe(parse()).on('data', (csvrow) => {
    /* ignore the first row */
    if (rowNum++ == 0) return;

    /* assign vars */
    let course_num = csvrow[FCE_COURSENUM_ROW],
        course_sec = csvrow[FCE_COURSESEC_ROW],
        course_hrs = csvrow[FCE_HOURS_ROW],
        course_yr  = csvrow[FCE_YEAR_ROW],
        course_sem = csvrow[FCE_SEM_ROW];

    /* make sure the course number has at least 5 characters */
    while (course_num.length < 5) {
        course_num = "0" + course_num;
    }

    /* check if course already in fces list */
    if (course_num in fces) {
        for (var i = 0; i < fces[course_num].length; i++) {
            /* check if we already have results from this year and average if yes */
            if (fces[course_num][i].year == course_yr && 
                fces[course_num][i].sem == course_sem) {
                /* average things out, maybe ? */
                /* prioritize lectures */
                if (isNaN(parseInt(course_sec, 10))) {
                    /* section */
                    if (isNaN(parseInt(fces[course_num][i].section, 10))) {
                        /* both are sections, average them out */
                        fces[course_num].hours = (fces[course_num].hours) * (fces[course_num].nbr);
                        fces[course_num].hours += course_hrs;
                        fces[course_num].nbr += 1;
                        fces[course_num].hours = (fces[course_num].hours) / (fces[course_num].nbr);
                    } else {
                        /* existing db is storing a lecture already, so don't write in */
                    }
                } else {
                    /* lecture */
                    if (isNaN(parseInt(fces[course_num][i].section, 10))) {
                        /* overwrite existing db's section with lecture data */
                        fces[course_num][i] = {
                            year: course_yr,
                            sem: course_sem,
                            section: course_sec,
                            nbr: 1,
                            hours: course_hrs
                        };
                    } else {
                        /* both are lectures, average them out */
                        fces[course_num].hours = (fces[course_num].hours) * (fces[course_num].nbr);
                        fces[course_num].hours += course_hrs;
                        fces[course_num].nbr += 1;
                        fces[course_num].hours = (fces[course_num].hours) / (fces[course_num].nbr);
                    }
                }
                return;
            }
        }
    } else {
        fces[course_num] = [];
    }

    fces[course_num].push({
        year: course_yr,
        sem: course_sem,
        section: course_sec,
        nbr: 1,
        hours: course_hrs
    });
}).on('end', () => {
    let fces_final = {};

    for (var course in fces) {
        let sum = 0;
        let nbr = 0;

        for (var i = 0; i < fces[course].length; i++) {
            let hours = parseFloat(fces[course][i].hours);
            if (!isNaN(hours)) {
                nbr += 1;
                sum += hours;
            }
        }
        
        let avg = sum / nbr;
        if (!isNaN(avg)) {
            fces_final[course] = avg;
        }
    }
    fs.writeFileSync('data/fce_data.json', JSON.stringify(fces));
    fs.writeFileSync('data/fce_hours.json', JSON.stringify(fces_final));
});
